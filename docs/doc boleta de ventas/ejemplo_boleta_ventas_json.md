{
    "personaId": "69ed41bd5652d20015116961",
    "personaToken": "DEV_... ---> aquí va tu 'personaToken'",
    "fileName": "20602384315-03-B001-00000001",
    "documentBody": {
        "cbc:UBLVersionID": {
            "_text": "2.1"
        },
        "cbc:CustomizationID": {
            "_text": "2.0"
        },
        "cbc:ID": {
            "_text": "B001-00000001"
        },
        "cbc:IssueDate": {
            "_text": "2026-04-26"
        },
        "cbc:IssueTime": {
            "_text": "03:22:28"
        },
        "cbc:InvoiceTypeCode": {
            "_attributes": {
                "listID": "0101"
            },
            "_text": "03"
        },
        "cbc:Note": [
            {
                "_text": "UN MIL SESENTA Y DOS CON 00/100 SOLES",
                "_attributes": {
                    "languageLocaleID": "1000"
                }
            }
        ],
        "cbc:DocumentCurrencyCode": {
            "_text": "PEN"
        },
        "cac:AccountingSupplierParty": {
            "cac:Party": {
                "cac:PartyIdentification": {
                    "cbc:ID": {
                        "_attributes": {
                            "schemeID": "6"
                        },
                        "_text": "20602384315"
                    }
                },
                "cac:PartyLegalEntity": {
                    "cbc:RegistrationName": {
                        "_text": "MAGENTA CONSULTORIA EN COMUNICACIONES S.A.C."
                    },
                    "cac:RegistrationAddress": {
                        "cbc:AddressTypeCode": {
                            "_text": "0000"
                        },
                        "cac:AddressLine": {
                            "cbc:Line": {
                                "_text": "JR. LOS RUBIES MZ. P1 LT. 10 APV. JORGE BASADRE SAN JUAN DE LURIGANCHO LIMA LIMA"
                            }
                        }
                    }
                }
            }
        },
        "cac:AccountingCustomerParty": {
            "cac:Party": {
                "cac:PartyIdentification": {
                    "cbc:ID": {
                        "_attributes": {
                            "schemeID": "6"
                        },
                        "_text": "10418148531"
                    }
                },
                "cac:PartyLegalEntity": {
                    "cbc:RegistrationName": {
                        "_text": "LEYVA OSPINA MARTIN FRANCO"
                    },
                    "cac:RegistrationAddress": {
                        "cac:AddressLine": {
                            "cbc:Line": {
                                "_text": "LOS RUBIES APV JORGE BASADRE (ALTURA PARADERO 20 AV. PROCERES DE INDEP) SAN JUAN DE LURIGANCHO LIMA LIMA"
                            }
                        }
                    }
                }
            }
        },
        "cac:TaxTotal": {
            "cbc:TaxAmount": {
                "_attributes": {
                    "currencyID": "PEN"
                },
                "_text": 162
            },
            "cac:TaxSubtotal": [
                {
                    "cbc:TaxableAmount": {
                        "_attributes": {
                            "currencyID": "PEN"
                        },
                        "_text": 900
                    },
                    "cbc:TaxAmount": {
                        "_attributes": {
                            "currencyID": "PEN"
                        },
                        "_text": 162
                    },
                    "cac:TaxCategory": {
                        "cac:TaxScheme": {
                            "cbc:ID": {
                                "_text": "1000"
                            },
                            "cbc:Name": {
                                "_text": "IGV"
                            },
                            "cbc:TaxTypeCode": {
                                "_text": "VAT"
                            }
                        }
                    }
                }
            ]
        },
        "cac:LegalMonetaryTotal": {
            "cbc:LineExtensionAmount": {
                "_attributes": {
                    "currencyID": "PEN"
                },
                "_text": 900
            },
            "cbc:TaxInclusiveAmount": {
                "_attributes": {
                    "currencyID": "PEN"
                },
                "_text": 1062
            },
            "cbc:PayableAmount": {
                "_attributes": {
                    "currencyID": "PEN"
                },
                "_text": 1062
            }
        },
        "cac:InvoiceLine": [
            {
                "cbc:ID": {
                    "_text": 1
                },
                "cbc:InvoicedQuantity": {
                    "_attributes": {
                        "unitCode": "NIU"
                    },
                    "_text": 1
                },
                "cbc:LineExtensionAmount": {
                    "_attributes": {
                        "currencyID": "PEN"
                    },
                    "_text": 900
                },
                "cac:PricingReference": {
                    "cac:AlternativeConditionPrice": {
                        "cbc:PriceAmount": {
                            "_attributes": {
                                "currencyID": "PEN"
                            },
                            "_text": 1062
                        },
                        "cbc:PriceTypeCode": {
                            "_text": "01"
                        }
                    }
                },
                "cac:AllowanceCharge": [
                    {
                        "cbc:ChargeIndicator": {
                            "_text": false
                        },
                        "cbc:AllowanceChargeReasonCode": {
                            "_text": "00"
                        },
                        "cbc:Amount": {
                            "_attributes": {
                                "currencyID": "PEN"
                            },
                            "_text": 100
                        }
                    }
                ],
                "cac:TaxTotal": {
                    "cbc:TaxAmount": {
                        "_attributes": {
                            "currencyID": "PEN"
                        },
                        "_text": 162
                    },
                    "cac:TaxSubtotal": [
                        {
                            "cbc:TaxableAmount": {
                                "_attributes": {
                                    "currencyID": "PEN"
                                },
                                "_text": 900
                            },
                            "cbc:TaxAmount": {
                                "_attributes": {
                                    "currencyID": "PEN"
                                },
                                "_text": 162
                            },
                            "cac:TaxCategory": {
                                "cbc:Percent": {
                                    "_text": 18
                                },
                                "cbc:TaxExemptionReasonCode": {
                                    "_text": "10"
                                },
                                "cac:TaxScheme": {
                                    "cbc:ID": {
                                        "_text": "1000"
                                    },
                                    "cbc:Name": {
                                        "_text": "IGV"
                                    },
                                    "cbc:TaxTypeCode": {
                                        "_text": "VAT"
                                    }
                                }
                            }
                        }
                    ]
                },
                "cac:Item": {
                    "cbc:Description": {
                        "_text": "Desarrollo web"
                    },
                    "cac:SellersItemIdentification": {
                        "cbc:ID": {
                            "_text": "web001"
                        }
                    }
                },
                "cac:Price": {
                    "cbc:PriceAmount": {
                        "_attributes": {
                            "currencyID": "PEN"
                        },
                        "_text": 1000
                    }
                }
            }
        ]
    }
}